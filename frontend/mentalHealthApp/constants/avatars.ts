import { ImageSourcePropType } from 'react-native';

export type AvatarOption = {
  id: number;
  source: ImageSourcePropType;
};

export const AVATARS: AvatarOption[] = [
  { id: 1,  source: require('@/assets/avatars/1.png')  },
  { id: 2,  source: require('@/assets/avatars/2.png')  },
  { id: 3,  source: require('@/assets/avatars/3.png')  },
  { id: 4,  source: require('@/assets/avatars/4.png')  },
  { id: 5,  source: require('@/assets/avatars/5.png')  },
  { id: 6,  source: require('@/assets/avatars/6.png')  },
  { id: 7,  source: require('@/assets/avatars/7.png')  },
  { id: 8,  source: require('@/assets/avatars/8.png')  },
  { id: 9,  source: require('@/assets/avatars/9.png')  },
  { id: 10, source: require('@/assets/avatars/10.png') },
  { id: 11, source: require('@/assets/avatars/11.png') },
  { id: 12, source: require('@/assets/avatars/12.png') },
  { id: 13, source: require('@/assets/avatars/13.png') },
  { id: 14, source: require('@/assets/avatars/14.png') },
  { id: 15, source: require('@/assets/avatars/15.png') },
  { id: 16, source: require('@/assets/avatars/16.png') },
  { id: 17, source: require('@/assets/avatars/17.png') },
];

export function getAvatarSource(id: number): ImageSourcePropType {
  return AVATARS.find((a) => a.id === id)?.source ?? AVATARS[0].source;
}
