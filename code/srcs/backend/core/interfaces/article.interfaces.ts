export interface I_Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  parent_id: number | null;
  author_id: number;
  published: number;
  created_at: string;
  updated_at: string;
}

export interface I_ArticleTree extends I_Article {
  children: I_ArticleTree[];
}
