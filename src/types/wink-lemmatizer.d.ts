declare module "wink-lemmatizer" {
  interface Lemmatizer {
    noun(word: string): string;
    verb(word: string): string;
    adjective(word: string): string;
  }

  const lemmatizer: Lemmatizer;
  export default lemmatizer;
}
