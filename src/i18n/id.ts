/**
 * Bahasa Indonesia. Same shape as `en` (enforced by the Strings type).
 * Informal "kamu", like most Indonesian phone apps; exercise names keep
 * their common gym loanwords.
 */
import type { Strings } from './en';

export const id: Strings = {
  common: {
    loading: 'Memuat…',
    done: 'Selesai',
  },
  // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu.
  dayLetters: ['M', 'S', 'S', 'R', 'K', 'J', 'S'],
  exercise: {
    squats: 'Squat',
    pushups: 'Push-up',
    jumping_jacks: 'Jumping jack',
    situps: 'Sit-up',
    steps: 'Langkah',
  },
  difficulty: {
    easy: 'Mudah',
    standard: 'Standar',
    hard: 'Sulit',
  },
  timeUntil: ({ days, hours, minutes }) => {
    if (days === 0 && hours === 0 && minutes === 0) return 'kurang dari semenit';
    if (days > 0) return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
    if (hours > 0) return `${hours} jam ${minutes} menit`;
    return `${minutes} menit`;
  },
  elapsed: (ms) => {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m} mnt ${s % 60} dtk` : `${s} dtk`;
  },
  streak: (n) => `${n} pagi`,

  alarms: {
    title: 'Alarm',
    practice: 'Latihan',
    settings: 'Pengaturan',
    notReadyTitle: 'Alarm kamu belum siap',
    notReadyBody: (n) =>
      `${n} pengaturan belum aktif — alarm bisa berbunyi tanpa membuka layar latihan.`,
    fixNow: 'Perbaiki',
    nextAlarm: (when) => `Alarm berikutnya dalam ${when}`,
    locked: (time) => `Terkunci — bunyi ${time}`,
    empty: 'Belum ada alarm. Tambahkan alarm pertamamu di bawah.',
    newAlarm: '+ Alarm baru',
  },
  card: {
    reps: (n) => `${n} repetisi`,
    delete: 'Hapus',
    deleteLabel: (time) => `Hapus alarm ${time}`,
  },
  form: {
    time: 'Waktu',
    ringsIn: (when) => `Berbunyi dalam ${when}`,
    hour: 'Jam',
    minute: 'Menit',
    repeat: 'Ulangi',
    exercise: 'Gerakan',
    reps: 'Repetisi',
    difficulty: 'Tingkat kesulitan',
    sound: 'Suara',
    backup: 'Cadangan jika kamera gagal',
    backupBody: (stepsPerRep) =>
      `Ganti dengan jalan: ${stepsPerRep} langkah per repetisi, dihitung sensor langkah. Dipakai saat kamera tertutup, ditolak, atau tidak melihatmu selama 2 menit.`,
    locksBefore: 'Terkunci sebelum berbunyi',
    minutes: (m) => `${m} mnt`,
    lockNote: (m) =>
      `Terkunci ${m} menit sebelum berbunyi — selama itu alarm tidak bisa diubah, diringankan, atau dihapus.`,
    save: 'Simpan alarm',
    saveChanges: 'Simpan perubahan',
  },
  sound: {
    phoneDefault: 'Bawaan ponsel',
    change: 'Ganti',
    needsDevBuild: 'Memilih suara butuh dev build.',
    label: (title) => `Suara alarm: ${title}`,
  },
  workout: {
    framing: {
      in_frame: { pill: 'Terlihat', cue: null },
      partial: { pill: 'Sebagian terlihat', cue: 'Mundur sedikit' },
      none: { pill: 'Tidak terlihat', cue: 'Masuk ke bingkai kamera' },
    },
    allowCamera: 'Izinkan kamera untuk menghitung repetisi',
    noSteps: 'Ponsel ini tidak bisa menghitung langkah',
    walk: 'Jalan atau jalan di tempat',
    stepsSetup: 'Kamera tidak bisa menghitung sekarang — ganti dengan jalan.',
    demo: 'Mode demo',
    stepBackup: 'Cadangan langkah',
    of: (target) => `dari ${target}`,
    toGo: (n, unit) => `${n} ${unit === 'steps' ? 'langkah' : 'repetisi'} lagi`,
  },
  instructions: {
    squats: {
      setup:
        'Sandarkan ponsel, lalu mundur sampai seluruh tubuhmu terlihat, menghadap kamera.',
      howTo:
        'Berdiri tegak, tekuk lutut sampai pinggul turun di bawah lutut — lalu berdiri tegak lagi. Itu satu repetisi.',
    },
    pushups: {
      setup:
        'Letakkan ponsel miring menghadapmu, cukup jauh untuk melihat seluruh tubuhmu dari samping.',
      howTo:
        'Dari posisi plank, turunkan dada sampai siku menekuk lebih dari 90°, lalu dorong sampai lengan lurus lagi.',
    },
    jumping_jacks: {
      setup:
        'Sandarkan ponsel, lalu mundur sampai seluruh tubuhmu terlihat, menghadap kamera.',
      howTo:
        'Lompat: kaki terbuka dan tepuk tangan di atas kepala, lalu lompat kembali ke kaki rapat, tangan di samping badan.',
    },
    situps: {
      setup:
        'Letakkan ponsel miring menghadapmu, cukup jauh untuk melihat seluruh tubuhmu dari samping.',
      howTo:
        'Berbaring telentang, angkat badan sampai dada mendekati lutut — lalu turunkan sepenuhnya lagi.',
    },
    steps: {
      setup: 'Simpan ponsel di saku atau genggam.',
      howTo: 'Jalan atau jalan di tempat. Langkah dihitung sensor gerak, tanpa kamera.',
    },
  },
  ringing: {
    wakingUp: 'Membangunkan…',
  },
  practice: {
    label: 'Latihan · tanpa alarm',
    again: 'Lagi',
    done: (n) => `Selesai — ${n} terhitung`,
  },
  done: {
    released: 'Bebas.',
    body: 'Tak ada snooze yang lolos. Ponselmu milikmu lagi.',
    reps: 'Repetisi',
    time: 'Waktu',
    streak: 'Beruntun',
    total: 'Total latihan',
    shareNote: 'Kartu streak untuk dibagikan hadir di versi berikutnya.',
  },
  settings: {
    title: 'Pengaturan',
    language: 'Bahasa',
    languageOptions: {
      system: 'Ikuti ponsel',
      en: 'English',
      id: 'Bahasa Indonesia',
    },
    languageShort: {
      system: 'Ponsel',
      en: 'English',
      id: 'Indonesia',
    },
    followingPhone: (language) => `Mengikuti ponsel: ${language}`,
    readiness: 'Kesiapan alarm',
    ready: 'Siap',
    toFix: (n) => `${n} perlu diperbaiki`,
    devBuild: 'Perlu dev build',
    readinessBody:
      'Izin yang dibutuhkan alarm untuk berbunyi, mengambil alih layar, dan diselesaikan.',
    lockIn: 'Jendela kunci bawaan',
  },
  readiness: {
    title: 'Siapkan alarm',
    checking: 'Memeriksa…',
    allSet: 'Semua siap — alarm bisa berbunyi, mengambil alih layar, dan diselesaikan.',
    progress: (done, total) =>
      `${done} dari ${total} siap · diperiksa ulang saat kamu kembali`,
    allow: 'Izinkan',
    open: 'Buka',
    confirm: 'Sudah',
    finishLater: 'Nanti saja',
    items: {
      notifications: {
        title: 'Notifikasi',
        why: 'Tanpa ini alarm tidak bisa tampil atau membuka layar latihan.',
      },
      fullScreen: {
        title: 'Alarm layar penuh',
        why: 'Membuka layar latihan di atas layar kunci.',
      },
      overlay: {
        title: 'Tampil di atas aplikasi lain',
        why: 'Mengambil alih layar saat kamu sedang memakai ponsel.',
      },
      autostart: {
        title: 'Xiaomi: Mulai otomatis',
        why: 'Android tidak bisa memeriksa ini — aktifkan, lalu ketuk Sudah.',
      },
      battery: {
        title: 'Baterai: tanpa batasan',
        why: 'Agar alarm tidak dihentikan saat malam.',
      },
      camera: { title: 'Kamera', why: 'Menghitung repetisimu.' },
      steps: {
        title: 'Penghitung langkah',
        why: 'Cadangan saat kamera tidak bisa menghitung.',
      },
      exactAlarms: { title: 'Alarm tepat waktu', why: 'Berbunyi tepat di menitnya.' },
    },
  },
  update: {
    available: 'Pembaruan tersedia',
    downloading: 'Mengunduh…',
    needsPermission:
      'Izinkan pemasangan dari Workout Alarm di pengaturan yang terbuka, lalu ketuk Pasang lagi.',
    failed: 'Gagal memasang pembaruan. Periksa koneksimu lalu coba lagi.',
    ready: (title) => `${title} siap dipasang.`,
    install: 'Pasang',
  },
  error: {
    title: 'Terjadi kesalahan',
    body: 'Alarm kamu tetap terjadwal dan akan berbunyi seperti biasa. Buka ulang aplikasi untuk melanjutkan.',
  },
};
