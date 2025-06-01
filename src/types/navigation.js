import type { StackScreenProps } from '@react-navigation/stack';

export type RootStackParamList = {
  Home: undefined;
  Reading: {
    bookId?: string;
    bookPath?: string;
    bookTitle?: string;
    lastPage?: number;
  };
  KanjiTest: undefined;
};

export type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;
export type ReadingScreenProps = StackScreenProps<RootStackParamList, 'Reading'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
