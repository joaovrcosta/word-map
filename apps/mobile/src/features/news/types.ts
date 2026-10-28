export type NewsListItem = {
  id: number;
  section: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  tags: string[];
  publishedAt: string | null;
  listenSeconds: number;
};

export type NewsDetail = {
  id: number;
  section: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  imageCaption: string | null;
  tags: string[];
  publishedAt: string | null;
  listenSeconds: number;
};
