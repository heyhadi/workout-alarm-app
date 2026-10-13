import type { ExerciseType } from '../types';

export interface ExerciseInstruction {
  /** Where to put the phone / how to stand so the camera sees you. */
  setup: string;
  /** What a counted rep looks like — plain language, no jargon. */
  howTo: string;
}

/**
 * What the user sees on the ringing screen while half asleep.
 * Keep each line short, concrete, and matched to what the pose
 * tracker actually measures (see repCounter.ts thresholds).
 */
export const EXERCISE_INSTRUCTIONS: Record<ExerciseType, ExerciseInstruction> = {
  squats: {
    setup: 'Prop the phone up and step back until your full body is in frame, facing the camera.',
    howTo: 'Stand tall, then bend your knees until your hips drop below knee level — then stand all the way back up. That\'s one rep.',
  },
  pushups: {
    setup: 'Lay the phone on its side facing you, far enough to see your full body from the side.',
    howTo: 'From a plank, lower your chest until your elbows bend past 90°, then push all the way back up to straight arms.',
  },
  jumping_jacks: {
    setup: 'Prop the phone up and step back until your full body is in frame, facing the camera.',
    howTo: 'Jump: feet apart and hands clap overhead, then jump back to feet together, arms down by your sides.',
  },
  situps: {
    setup: 'Lay the phone on its side facing you, far enough to see your full body from the side.',
    howTo: 'Lie back flat, then curl your torso all the way up — chest toward knees — then lower fully back down.',
  },
  steps: {
    setup: 'Keep the phone in your pocket or hand.',
    howTo: 'Walk or march in place. Steps are counted by the motion sensor, no camera needed.',
  },
};
