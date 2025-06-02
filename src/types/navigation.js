import type { StackScreenProps } from '@react-navigation/stack';

export type RootStackParamList = {
  Home: undefined;
  Reading: {
    bookId?: string;
    bookPath?: string;
    bookTitle?: string;
    lastPage?: number;
  };
  ImageAnalysis: {
    imageUri: string;
    imageTitle: string;
  };
  KanjiExplorer: undefined;
  KanjiDetail: {
    character: string;
    fromReading?: boolean; // true if navigated from reading a book
  };
};

export type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;
export type ReadingScreenProps = StackScreenProps<RootStackParamList, 'Reading'>;
export type KanjiExplorerScreenProps = StackScreenProps<RootStackParamList, 'KanjiExplorer'>;
export type KanjiDetailScreenProps = StackScreenProps<RootStackParamList, 'KanjiDetail'>;
export type ImageAnalysisScreenProps = StackScreenProps<RootStackParamList, 'ImageAnalysis'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
