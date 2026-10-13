/**
 * English UI strings — the source of truth for every visible word.
 * Other languages implement the same `Strings` shape, so a missing
 * translation is a type error, not a blank label.
 */
import type { ExerciseType, Difficulty } from '../types';
import type { ReadinessKey } from '../readiness/checklist';
import type { TimeUntil } from '../workout/scheduling';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const en = {
  common: {
    loading: 'Loading…',
    done: 'Done',
  },
  /** Sunday-first, matching Date.getDay(). */
  dayLetters: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  exercise: {
    squats: 'Squats',
    pushups: 'Push-ups',
    jumping_jacks: 'Jumping jacks',
    situps: 'Sit-ups',
    steps: 'Steps',
  } satisfies Record<ExerciseType, string>,
  difficulty: {
    easy: 'Easy',
    standard: 'Standard',
    hard: 'Hard',
  } satisfies Record<Difficulty, string>,
  /** Countdown to a fire time: "7 h 12 min", "2 d 3 h", "under a minute". */
  timeUntil: ({ days, hours, minutes }: TimeUntil) => {
    if (days === 0 && hours === 0 && minutes === 0) return 'under a minute';
    if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
    if (hours > 0) return `${hours} h ${minutes} min`;
    return `${minutes} min`;
  },
  /** Workout length on the Done screen: "1m 20s". */
  elapsed: (ms: number) => {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  },
  streak: (n: number) => `${n} ${plural(n, 'morning', 'mornings')}`,

  alarms: {
    title: 'Alarms',
    practice: 'Practice',
    settings: 'Settings',
    notReadyTitle: 'Your alarm isn’t ready',
    notReadyBody: (n: number) =>
      `${n} ${plural(n, 'setting', 'settings')} missing — it may ring without opening the workout.`,
    fixNow: 'Fix now',
    nextAlarm: (when: string) => `Next alarm in ${when}`,
    locked: (time: string) => `Locked — fires ${time}`,
    empty: 'No alarms yet. Add your first one below.',
    newAlarm: '+ New alarm',
  },
  card: {
    reps: (n: number) => `${n} reps`,
    delete: 'Delete',
    deleteLabel: (time: string) => `Delete alarm ${time}`,
  },
  form: {
    time: 'Time',
    ringsIn: (when: string) => `Rings in ${when}`,
    hour: 'Hour',
    minute: 'Minute',
    repeat: 'Repeat',
    workout: 'Workout',
    safety: 'Safety',
    cameraBackup: 'Camera backup',
    lockWindow: 'Lock window',
    exercise: 'Exercise',
    reps: 'Reps',
    difficulty: 'Difficulty',
    sound: 'Sound',
    backup: 'Backup if camera fails',
    backupBody: (stepsPerRep: number) =>
      `Walk it off: ${stepsPerRep} steps per rep, counted by the step sensor. Used when the camera is blocked, denied or can’t see you for 2 minutes.`,
    locksBefore: 'Locks before firing',
    minutes: (m: number) => `${m}m`,
    lockNote: (m: number) =>
      `Locks ${m} min before it fires — inside the window the alarm cannot be edited, weakened, or deleted.`,
    save: 'Save alarm',
    saveChanges: 'Save changes',
  },
  sound: {
    phoneDefault: 'Phone default',
    change: 'Change',
    needsDevBuild: 'Choosing a sound needs a dev build.',
    label: (title: string) => `Alarm sound: ${title}`,
  },
  workout: {
    framing: {
      in_frame: { pill: 'In frame', cue: null as string | null },
      partial: { pill: 'Partly in frame', cue: 'Step back a little' as string | null },
      none: { pill: 'Not in frame', cue: 'Step into frame' as string | null },
    },
    allowCamera: 'Allow camera access to count reps',
    noSteps: 'This phone can’t count steps',
    walk: 'Walk or march in place',
    stepsSetup: 'The camera can’t count right now — walk it off instead.',
    demo: 'Demo mode',
    stepBackup: 'Step backup',
    of: (target: number) => `of ${target}`,
    toGo: (n: number, unit: 'reps' | 'steps') => `${n} ${unit} to go`,
  },
  instructions: {
    squats: {
      setup:
        'Prop the phone up and step back until your full body is in frame, facing the camera.',
      howTo:
        'Stand tall, then bend your knees until your hips drop below knee level — then stand all the way back up. That’s one rep.',
    },
    pushups: {
      setup:
        'Lay the phone on its side facing you, far enough to see your full body from the side.',
      howTo:
        'From a plank, lower your chest until your elbows bend past 90°, then push all the way back up to straight arms.',
    },
    jumping_jacks: {
      setup:
        'Prop the phone up and step back until your full body is in frame, facing the camera.',
      howTo:
        'Jump: feet apart and hands clap overhead, then jump back to feet together, arms down by your sides.',
    },
    situps: {
      setup:
        'Lay the phone on its side facing you, far enough to see your full body from the side.',
      howTo:
        'Lie back flat, then curl your torso all the way up — chest toward knees — then lower fully back down.',
    },
    steps: {
      setup: 'Keep the phone in your pocket or hand.',
      howTo:
        'Walk or march in place. Steps are counted by the motion sensor, no camera needed.',
    },
  } satisfies Record<ExerciseType, { setup: string; howTo: string }>,
  ringing: {
    wakingUp: 'Waking up…',
  },
  emergency: {
    setting: 'Emergency exit',
    toggleTitle: 'Slow emergency exit',
    toggleBody: 'A deliberately hard way out. Off by default.',
    stateOff: 'No way out — the workout is the only exit.',
    stateOn:
      'After 10 minutes of ringing: hold for 60 seconds, then type a sentence. That morning doesn’t count toward your streak.',
    options: { none: 'Off', slow: 'Slow exit' },
    settingBody:
      'For mornings a workout truly can’t happen. After 10 minutes of ringing: hold for 60 seconds, then type a sentence. That morning doesn’t count toward your streak.',
    link: 'Emergency exit',
    title: 'Emergency exit',
    body: 'Hold the button for 60 seconds without letting go. Then type the sentence to stop the alarm. Today won’t count toward your streak.',
    hold: 'Hold to continue',
    holding: (secondsLeft: number) => `Keep holding… ${secondsLeft}s`,
    typePrompt: 'Type this sentence exactly:',
    phrase: 'I am choosing to skip my workout today.',
    exit: 'Stop the alarm',
    cancel: 'Back to the workout',
  },
  practice: {
    label: 'Practice · no alarm',
    again: 'Again',
    done: (n: number) => `Done — ${n} counted`,
  },
  done: {
    skippedTitle: 'Skipped.',
    skippedBody: 'Emergency exit used. Today doesn’t count toward your streak.',
    released: 'Released.',
    body: 'No snooze survived. The phone is yours again.',
    reps: 'Reps',
    time: 'Time',
    streak: 'Streak',
    total: 'Total workouts',
    shareNote: 'Shareable streak card ships in a later milestone.',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageOptions: {
      system: 'Phone setting',
      en: 'English',
      id: 'Bahasa Indonesia',
    },
    /** Short labels for the language segments. */
    languageShort: {
      system: 'Phone',
      en: 'English',
      id: 'Indonesia',
    },
    followingPhone: (language: string) => `Following your phone: ${language}`,
    readiness: 'Alarm readiness',
    ready: 'Ready',
    readyBody: 'All alarm permissions are on.',
    fixBody: 'Tap to see what’s missing.',
    backupTitle: 'Walk it off',
    backupBody: (stepsPerRep: number) =>
      `${stepsPerRep} steps per rep, counted by the step sensor. Used when the camera can’t count.`,
    toFix: (n: number) => `${n} to fix`,
    devBuild: 'Requires a dev build',
    readinessBody:
      'Permissions the alarm needs to ring, take over the screen and be finished.',
    lockIn: 'Default lock-in window',
  },
  readiness: {
    title: 'Get alarm-ready',
    checking: 'Checking…',
    allSet: 'All set — your alarm can ring, take over the screen and be finished.',
    progress: (done: number, total: number) =>
      `${done} of ${total} done · rechecks when you come back`,
    allow: 'Allow',
    open: 'Open',
    confirm: 'Done',
    finishLater: 'Finish later',
    items: {
      notifications: {
        title: 'Notifications',
        why: 'Without them the alarm can’t show or open the workout.',
      },
      fullScreen: {
        title: 'Full-screen alarms',
        why: 'Opens the workout over the lock screen.',
      },
      overlay: {
        title: 'Open over other apps',
        why: 'Takes over the screen while you’re using the phone.',
      },
      autostart: {
        title: 'Xiaomi: Autostart',
        why: 'Android can’t check this one — switch it on, then tap Done.',
      },
      battery: {
        title: 'Battery: no restrictions',
        why: 'Keeps the alarm from being stopped overnight.',
      },
      camera: { title: 'Camera', why: 'Counts your reps.' },
      steps: { title: 'Step counter', why: 'Backup when the camera can’t count.' },
      exactAlarms: { title: 'Exact alarms', why: 'Rings on the minute.' },
    } satisfies Record<ReadinessKey, { title: string; why: string }>,
  },
  update: {
    available: 'Update available',
    downloading: 'Downloading…',
    needsPermission:
      'Allow installs from Workout Alarm in the settings that opened, then tap Install again.',
    failed: 'Couldn’t install the update. Check your connection and try again.',
    ready: (title: string) => `${title} is ready to install.`,
    install: 'Install',
  },
  error: {
    title: 'Something went wrong',
    body: 'Your alarms are still scheduled natively and will ring as usual. Restart the app to continue.',
  },
};

export type Strings = typeof en;
