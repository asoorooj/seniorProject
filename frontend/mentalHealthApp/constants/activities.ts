export type Activity = {
  label: string;
  category: string;
};

export const ACTIVITIES: Activity[] = [
  // Grounding & Calm
  { label: 'Meditation',        category: 'Grounding & Calm' },
  { label: 'Deep breathing',    category: 'Grounding & Calm' },
  { label: 'Journaling',        category: 'Grounding & Calm' },
  { label: 'Mindfulness',       category: 'Grounding & Calm' },
  { label: 'Gratitude practice',category: 'Grounding & Calm' },

  // Movement
  { label: 'Walking outside',   category: 'Movement' },
  { label: 'Yoga',              category: 'Movement' },
  { label: 'Exercise',          category: 'Movement' },
  { label: 'Dancing',           category: 'Movement' },
  { label: 'Swimming',          category: 'Movement' },

  // Creative
  { label: 'Drawing / Art',     category: 'Creative' },
  { label: 'Writing',           category: 'Creative' },
  { label: 'Playing music',     category: 'Creative' },
  { label: 'Cooking / Baking',  category: 'Creative' },
  { label: 'Photography',       category: 'Creative' },

  // Social
  { label: 'Talking to friends',category: 'Social' },
  { label: 'Family time',       category: 'Social' },
  { label: 'Volunteering',      category: 'Social' },
  { label: 'Group activities',  category: 'Social' },

  // Rest & Recovery
  { label: 'Reading',           category: 'Rest & Recovery' },
  { label: 'Listening to music',category: 'Rest & Recovery' },
  { label: 'Self-care routines',category: 'Rest & Recovery' },
  { label: 'Comfort shows',     category: 'Rest & Recovery' },
  { label: 'Napping / Rest',    category: 'Rest & Recovery' },

  // Therapy & Growth
  { label: 'Therapy',           category: 'Therapy & Growth' },
  { label: 'Affirmations',      category: 'Therapy & Growth' },
  { label: 'Breathing exercises',category: 'Therapy & Growth' },

  // Hobbies
  { label: 'Gardening',         category: 'Hobbies' },
  { label: 'Puzzles',           category: 'Hobbies' },
  { label: 'Pets / Animals',    category: 'Hobbies' },
  { label: 'Gaming',            category: 'Hobbies' },
  { label: 'Time in nature',    category: 'Hobbies' },
];
