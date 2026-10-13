/**
 * Bahasa Indonesia — santai, kayak ngobrol. Same shape as `en` (enforced
 * by the Strings type). Everyday words over formal ones: "HP" not
 * "ponsel", "rep" not "repetisi", "kalau", "nggak". Say what happens to
 * the user, not how Android calls it.
 */
import type { Strings } from './en';

export const id: Strings = {
  common: {
    loading: 'Sebentar…',
    done: 'Selesai',
  },
  // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu.
  dayLetters: ['M', 'S', 'S', 'R', 'K', 'J', 'S'],
  exercise: {
    squats: 'Squat',
    pushups: 'Push-up',
    jumping_jacks: 'Jumping jack',
    situps: 'Sit-up',
    steps: 'Jalan',
  },
  difficulty: {
    easy: 'Santai',
    standard: 'Normal',
    hard: 'Berat',
  },
  timeUntil: ({ days, hours, minutes }) => {
    if (days === 0 && hours === 0 && minutes === 0) return 'kurang dari 1 menit';
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
    practice: 'Coba dulu',
    settings: 'Pengaturan',
    notReadyTitle: 'Alarm kamu belum siap',
    notReadyBody: (n) =>
      `Ada ${n} hal yang belum diizinkan. Bisa-bisa alarm bunyi tapi layar olahraganya nggak muncul.`,
    fixNow: 'Beresin',
    nextAlarm: (when) => `Alarm berikutnya ${when} lagi`,
    locked: (time) => `Dikunci — bunyi jam ${time}`,
    empty: 'Belum ada alarm. Bikin yang pertama di bawah.',
    newAlarm: '+ Alarm baru',
  },
  card: {
    reps: (n) => `${n} rep`,
    delete: 'Hapus',
    deleteLabel: (time) => `Hapus alarm ${time}`,
  },
  form: {
    time: 'Jam',
    ringsIn: (when) => `Bunyi ${when} lagi`,
    hour: 'Jam',
    minute: 'Menit',
    repeat: 'Ulangi tiap',
    workout: 'Olahraga',
    safety: 'Pengaman',
    cameraBackup: 'Kalau kamera gagal',
    lockWindow: 'Waktu kunci',
    exercise: 'Gerakan',
    reps: 'Jumlah rep',
    difficulty: 'Tingkat',
    sound: 'Suara',
    backup: 'Kalau kamera gagal',
    backupBody: (stepsPerRep) =>
      `Ganti jalan aja: ${stepsPerRep} langkah = 1 rep, dihitung sama HP. Dipakai kalau kamera ketutup, nggak diizinkan, atau nggak lihat kamu selama 2 menit.`,
    locksBefore: 'Dikunci sebelum bunyi',
    minutes: (m) => `${m} mnt`,
    lockNote: (m) =>
      `${m} menit sebelum bunyi, alarm dikunci — nggak bisa diubah, dikurangi, atau dihapus.`,
    save: 'Simpan alarm',
    saveChanges: 'Simpan',
  },
  sound: {
    phoneDefault: 'Suara bawaan HP',
    change: 'Ganti',
    needsDevBuild: 'Ganti suara cuma bisa di dev build.',
    label: (title) => `Suara alarm: ${title}`,
  },
  workout: {
    framing: {
      in_frame: { pill: 'Kelihatan', cue: null },
      partial: { pill: 'Kepotong', cue: 'Mundur dikit' },
      none: { pill: 'Nggak kelihatan', cue: 'Masuk ke kamera dulu' },
    },
    allowCamera: 'Izinkan kamera biar rep bisa dihitung',
    noSteps: 'HP ini nggak bisa ngitung langkah',
    walk: 'Jalan atau jalan di tempat',
    stepsSetup: 'Kamera lagi nggak bisa ngitung — ganti jalan aja.',
    demo: 'Mode demo',
    stepBackup: 'Ganti jalan',
    of: (target) => `dari ${target}`,
    toGo: (n, unit) => `${n} ${unit === 'steps' ? 'langkah' : 'rep'} lagi`,
  },
  instructions: {
    squats: {
      setup:
        'Sandarin HP, terus mundur sampai badan kamu kelihatan semua. Hadap kamera.',
      howTo:
        'Berdiri tegak, jongkok sampai pinggul lebih rendah dari lutut, terus berdiri lagi. Itu 1 rep.',
    },
    pushups: {
      setup:
        'Taruh HP miring ngadep kamu, agak jauh biar badan kelihatan dari samping.',
      howTo:
        'Dari posisi plank, turunin dada sampai siku nekuk, terus dorong lagi sampai tangan lurus.',
    },
    jumping_jacks: {
      setup:
        'Sandarin HP, terus mundur sampai badan kamu kelihatan semua. Hadap kamera.',
      howTo:
        'Lompat sambil buka kaki dan tepuk tangan di atas kepala, terus lompat balik ke posisi awal.',
    },
    situps: {
      setup:
        'Taruh HP miring ngadep kamu, agak jauh biar badan kelihatan dari samping.',
      howTo:
        'Tiduran, angkat badan sampai dada dekat ke lutut, terus turun lagi sampai rebahan.',
    },
    steps: {
      setup: 'Pegang HP atau taruh di saku.',
      howTo:
        'Jalan atau jalan di tempat. Langkahnya dihitung sama HP, nggak perlu kamera.',
    },
  },
  ringing: {
    wakingUp: 'Bangun, bangun…',
  },
  emergency: {
    setting: 'Jalan keluar darurat',
    toggleTitle: 'Keluar darurat (pelan)',
    toggleBody:
      'Cara matiin alarm tanpa olahraga, tapi sengaja dibikin ribet. Awalnya mati.',
    stateOff: 'Nggak ada jalan keluar — satu-satunya cara ya olahraga.',
    stateOn:
      'Setelah alarm bunyi 10 menit: tahan tombol 60 detik, terus ketik satu kalimat. Pagi itu nggak masuk streak.',
    options: { none: 'Mati', slow: 'Nyala' },
    settingBody:
      'Buat pagi yang beneran nggak bisa olahraga. Setelah bunyi 10 menit: tahan 60 detik, terus ketik kalimat. Pagi itu nggak masuk streak.',
    link: 'Keluar darurat',
    title: 'Keluar darurat',
    body: 'Tahan tombolnya 60 detik, jangan dilepas. Terus ketik kalimatnya buat matiin alarm. Hari ini nggak masuk streak.',
    hold: 'Tahan di sini',
    holding: (secondsLeft) => `Terus tahan… ${secondsLeft} dtk`,
    typePrompt: 'Ketik kalimat ini persis:',
    phrase: 'Saya memilih untuk melewatkan olahraga hari ini.',
    exit: 'Matiin alarm',
    cancel: 'Balik olahraga',
  },
  practice: {
    label: 'Coba dulu · tanpa alarm',
    again: 'Ulang',
    done: (n) => `Beres — ${n} kehitung`,
  },
  done: {
    skippedTitle: 'Dilewatin.',
    skippedBody: 'Kamu pakai keluar darurat. Hari ini nggak masuk streak.',
    released: 'Beres!',
    body: 'Alarm mati, HP kamu bebas lagi.',
    reps: 'Rep',
    time: 'Waktu',
    streak: 'Streak',
    total: 'Total olahraga',
    shareNote: 'Kartu streak buat dibagikan bakal ada nanti.',
  },
  settings: {
    title: 'Pengaturan',
    language: 'Bahasa',
    languageOptions: {
      system: 'Ikut HP',
      en: 'English',
      id: 'Bahasa Indonesia',
    },
    languageShort: {
      system: 'Ikut HP',
      en: 'English',
      id: 'Indonesia',
    },
    followingPhone: (language) => `Ikut bahasa HP: ${language}`,
    appearance: 'Tampilan',
    appearanceShort: { system: 'Ikut HP', light: 'Terang', dark: 'Gelap' },
    readiness: 'Kesiapan alarm',
    ready: 'Siap',
    readyBody: 'Semua izin alarm udah aktif.',
    fixBody: 'Ketuk buat lihat apa yang kurang.',
    backupTitle: 'Ganti jalan',
    backupBody: (stepsPerRep) =>
      `${stepsPerRep} langkah = 1 rep, dihitung sama HP. Dipakai kalau kamera nggak bisa ngitung.`,
    toFix: (n) => `${n} belum beres`,
    devBuild: 'Perlu dev build',
    readinessBody:
      'Izin yang dibutuhin alarm biar bisa bunyi, muncul di layar, dan dimatiin.',
    lockIn: 'Waktu kunci bawaan',
  },
  readiness: {
    title: 'Siapin alarm',
    checking: 'Lagi ngecek…',
    allSet: 'Udah siap semua — alarm bisa bunyi, muncul di layar, dan dimatiin.',
    progress: (done, total) =>
      `${done} dari ${total} beres · dicek lagi pas kamu balik`,
    allow: 'Izinkan',
    open: 'Buka',
    confirm: 'Udah',
    finishLater: 'Nanti aja',
    items: {
      notifications: {
        title: 'Notifikasi',
        why: 'Tanpa ini alarm nggak bisa muncul.',
      },
      fullScreen: {
        title: 'Muncul di layar kunci',
        why: 'Biar layar olahraga langsung muncul walau HP kekunci.',
      },
      overlay: {
        title: 'Muncul di atas aplikasi lain',
        why: 'Biar alarm tetap muncul walau kamu lagi main HP.',
      },
      autostart: {
        title: 'Xiaomi: Mulai otomatis',
        why: 'Ini nggak bisa dicek otomatis. Nyalain dulu, terus ketuk Udah.',
      },
      battery: {
        title: 'Baterai: tanpa batasan',
        why: 'Biar alarm nggak dimatiin HP pas malam.',
      },
      camera: { title: 'Kamera', why: 'Buat ngitung rep kamu.' },
      steps: {
        title: 'Hitung langkah',
        why: 'Cadangan kalau kamera nggak bisa ngitung.',
      },
      exactAlarms: { title: 'Alarm tepat waktu', why: 'Biar bunyi pas di menitnya.' },
    },
  },
  update: {
    available: 'Ada versi baru',
    downloading: 'Lagi download…',
    needsPermission:
      'Izinkan Workout Alarm pasang aplikasi di pengaturan yang kebuka, terus ketuk Pasang lagi.',
    failed: 'Gagal pasang update. Cek internet kamu terus coba lagi.',
    ready: (title) => `${title} siap dipasang.`,
    install: 'Pasang',
  },
  error: {
    title: 'Ada yang error',
    body: 'Alarm kamu tetap jalan dan bakal bunyi kayak biasa. Buka ulang aplikasinya ya.',
  },
};
