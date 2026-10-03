import type { Passage, PassageDifficulty, Difficulty } from './types';
export const passages: Passage[] = [
  { id: 'e1', difficulty: 'easy', title: 'Open road', text: 'The open road is waiting. Take a deep breath, find your rhythm, and let your hands lead the way. Every small step brings you closer to the finish line.' },
  { id: 'e2', difficulty: 'easy', title: 'The little things', text: 'A warm cup of tea and a good book can make a rainy day feel bright. Slow down and enjoy the little things. There is always a new story just around the corner.' },
  { id: 'e3', difficulty: 'easy', title: 'Golden hour', text: 'The sun sets over the hills as we drive back home. The sky turns gold and the air feels cool. We roll down the windows and sing along to our favorite song.' },
  { id: 'e4', difficulty: 'easy', title: 'Finding your pace', text: 'You do not need to be the fastest on your first day. Keep your eyes on the road and trust your own pace. With a little practice, every turn gets easier.' },
  { id: 'm1', difficulty: 'medium', title: 'Night drive', text: 'The city lights blur into a ribbon of color as the engine hums beneath you. There is a certain freedom in the open road: no distractions, no deadlines, just the rhythm of the journey. Find your focus, trust your instincts, and keep moving forward.' },
  { id: 'm2', difficulty: 'medium', title: 'The perfect lap', text: 'A great lap is more than speed. It is the quiet balance between patience and precision, the moment you know exactly when to turn. Take each corner with care, keep a steady rhythm, and remember: consistency will always take you further than a lucky start.' },
  { id: 'm3', difficulty: 'medium', title: 'Small adventures', text: 'Sometimes, the best adventures begin without a plan. You take an unfamiliar street, discover a tiny coffee shop, or watch the clouds from a park bench. The world has a way of surprising us when we put down our phones and pay attention.' },
  { id: 'm4', difficulty: 'medium', title: 'Building momentum', text: 'Progress rarely arrives all at once. It comes from showing up, making mistakes, and trying again with a little more knowledge. Whether you are learning to code or learning to race, the secret is the same: start small, stay curious, and enjoy the process.' },
  { id: 'h1', difficulty: 'hard', title: 'Precision engineering', text: 'At 240 kilometers per hour, precision becomes the difference between victory and a missed opportunity. The engineer recalibrated the suspension by 0.75 degrees, adjusted the aerodynamic balance, and reviewed 128 telemetry readings. "Consistency beats aggression," she reminded the driver. A championship is built from thousands of deliberate decisions, each one a fraction better than the last.' },
  { id: 'h2', difficulty: 'hard', title: 'The observatory', text: 'Beyond the observatory, an extraordinary constellation appeared at 23:47. Researchers compared 3 independent measurements; the discrepancy was only 0.002 percent. "Perhaps we underestimated the complexity," remarked the astrophysicist. Nevertheless, the team continued its meticulous investigation, documenting every anomaly with unwavering curiosity and a remarkable commitment to accuracy.' },
  { id: 'h3', difficulty: 'hard', title: 'Race strategy', text: 'The forecast predicted a 65% chance of rain, complicating an already unpredictable championship. Strategists weighed the alternatives: pit on lap 17, preserve the intermediate tires, or gamble on a 2-stop strategy. Meanwhile, the driver\'s concentration remained absolute. Under extraordinary pressure, even a millisecond of hesitation could transform a seemingly inevitable victory into an unforgettable disappointment.' },
];
export function selectPassage(difficulty: PassageDifficulty, previousId?: string): Passage {
  const choices = passages.filter(p => p.difficulty === difficulty && p.id !== previousId);
  return choices[Math.floor(Math.random() * choices.length)];
}
export const difficultyInfo: Record<Difficulty, { label: string; range: string; speeds: [number, number]; description: string }> = {
  easy: { label: 'Easy', range: '25–40 WPM', speeds: [25, 40], description: 'Find your rhythm' },
  medium: { label: 'Medium', range: '45–60 WPM', speeds: [45, 60], description: 'A little competition' },
  hard: { label: 'Hard', range: '65–85 WPM', speeds: [65, 85], description: 'Push your limits' },
  expert: { label: 'Expert', range: '90–115 WPM', speeds: [90, 115], description: 'Bring your A-game' },
};
