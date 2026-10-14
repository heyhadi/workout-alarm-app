package com.workoutalarm.app.update

import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * UpdateModule — install a newer APK published on the repo's GitHub
 * Releases, for builds that don't come from the Play Store.
 *
 * downloadAndInstall() fetches the APK over HTTPS and refuses it unless it
 * is this app (same package), newer (higher versionCode) and signed with
 * the same key as the installed app — then hands it to Android's own
 * installer, where the user confirms. Android enforces the same-key rule
 * again at install time.
 */
class UpdateModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "UpdateModule"

  /** versionCode of the installed app (CI stamps it with the build number). */
  @ReactMethod
  fun getInstalledBuild(promise: Promise) {
    promise.resolve(versionCode(installedInfo(0)).toDouble())
  }

  @ReactMethod
  fun downloadAndInstall(url: String, promise: Promise) {
    if (!url.startsWith(ALLOWED_URL_PREFIX)) {
      promise.reject("BAD_URL", "Updates only come from the app's GitHub releases")
      return
    }
    val context = reactApplicationContext
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      !context.packageManager.canRequestPackageInstalls()
    ) {
      // One-time "Install unknown apps" switch for this app.
      context.startActivity(
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
          .setData(Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
      promise.reject("NEEDS_INSTALL_PERMISSION", "Allow installs from Workout Alarm, then try again")
      return
    }

    Thread {
      try {
        val apk = download(url)
        verify(apk)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", apk)
        context.startActivity(
          Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("UPDATE_FAILED", e.message ?: "Update failed", e)
      }
    }.start()
  }

  private fun download(url: String): File {
    val dir = File(reactApplicationContext.cacheDir, "updates").apply { mkdirs() }
    dir.listFiles()?.forEach { it.delete() } // one update on disk at a time
    val apk = File(dir, "update.apk")
    // GitHub redirects release downloads to its CDN; HttpURLConnection follows
    // https → https redirects on its own.
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 15_000
    connection.readTimeout = 60_000
    try {
      if (connection.responseCode != HttpURLConnection.HTTP_OK) {
        throw IllegalStateException("Download failed (HTTP ${connection.responseCode})")
      }
      val total = connection.contentLengthLong.takeIf { it > 0 } ?: -1L
      var downloaded = 0L
      var lastEmitted = 0L
      connection.inputStream.use { input ->
        apk.outputStream().use { output ->
          val buf = ByteArray(64 * 1024)
          while (true) {
            val n = input.read(buf)
            if (n < 0) break
            output.write(buf, 0, n)
            downloaded += n
            // Throttle events: emit at most every 256 KB so the bridge
            // isn't flooded on a fast connection.
            if (downloaded - lastEmitted >= 256 * 1024 || (total > 0 && downloaded >= total)) {
              lastEmitted = downloaded
              emitProgress(downloaded, total)
            }
          }
        }
      }
      emitProgress(downloaded, total)
    } finally {
      connection.disconnect()
    }
    return apk
  }

  private fun emitProgress(downloaded: Long, total: Long) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onDownloadProgress", Arguments.createMap().apply {
        putDouble("downloaded", downloaded.toDouble())
        putDouble("total", total.toDouble())
      })
  }

  /** Same package, newer build, same signing key — or no install. */
  private fun verify(apk: File) {
    val pm = reactApplicationContext.packageManager
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      PackageManager.GET_SIGNING_CERTIFICATES
    } else {
      @Suppress("DEPRECATION")
      PackageManager.GET_SIGNATURES
    }
    val candidate = pm.getPackageArchiveInfo(apk.path, flags)
      ?: throw IllegalStateException("Downloaded file isn't an app")
    val installed = installedInfo(flags)

    if (candidate.packageName != installed.packageName) {
      throw IllegalStateException("Downloaded app isn't Workout Alarm")
    }
    if (versionCode(candidate) <= versionCode(installed)) {
      throw IllegalStateException("Downloaded build isn't newer")
    }
    val candidateSigners = signatures(candidate)
    if (candidateSigners.isEmpty() || candidateSigners != signatures(installed)) {
      throw IllegalStateException("Downloaded app isn't signed with this app's key")
    }
  }

  private fun installedInfo(flags: Int): PackageInfo =
    reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, flags)

  private fun versionCode(info: PackageInfo): Long =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      info.longVersionCode
    } else {
      @Suppress("DEPRECATION")
      info.versionCode.toLong()
    }

  private fun signatures(info: PackageInfo): Set<String> {
    val sigs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      info.signingInfo?.apkContentsSigners
    } else {
      @Suppress("DEPRECATION")
      info.signatures
    }
    return sigs.orEmpty().map { it.toCharsString() }.toSet()
  }

  companion object {
    private const val ALLOWED_URL_PREFIX =
      "https://github.com/heyhadi/workout-alarm-app/releases/download/"
  }
}

/** Own subclass so the manifest entry can't collide with a library's provider. */
class UpdateFileProvider : FileProvider()
