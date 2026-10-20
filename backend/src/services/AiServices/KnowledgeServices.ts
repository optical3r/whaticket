import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import KnowledgeArticle from "../../models/KnowledgeArticle";

// Everything active goes into each assistant request, so the total size is
// capped instead of cutting articles off without telling anyone.
export const MAX_KNOWLEDGE_CHARACTERS = 200000;
const MAX_ARTICLE_CHARACTERS = 20000;
const MAX_ARTICLES = 200;

interface ArticleData {
  title: string;
  content: string;
  active?: boolean;
}

const schema = Yup.object().shape({
  title: Yup.string()
    .trim()
    .required("ERR_KNOWLEDGE_INVALID_TITLE")
    .min(2, "ERR_KNOWLEDGE_INVALID_TITLE")
    .max(120, "ERR_KNOWLEDGE_INVALID_TITLE"),
  content: Yup.string()
    .trim()
    .required("ERR_KNOWLEDGE_EMPTY")
    .max(MAX_ARTICLE_CHARACTERS, "ERR_KNOWLEDGE_ARTICLE_TOO_LARGE"),
  active: Yup.boolean()
});

export const ListKnowledgeService = async (
  companyId: number
): Promise<KnowledgeArticle[]> =>
  KnowledgeArticle.findAll({ where: { companyId }, order: [["title", "ASC"]] });

export const ListActiveKnowledge = async (
  companyId: number
): Promise<KnowledgeArticle[]> =>
  KnowledgeArticle.findAll({
    where: { companyId, active: true },
    order: [["title", "ASC"]]
  });

const activeCharacters = async (
  companyId: number,
  exceptId?: number | string
): Promise<number> => {
  const articles = await KnowledgeArticle.findAll({
    where: {
      companyId,
      active: true,
      ...(exceptId ? { id: { [Op.ne]: exceptId } } : {})
    },
    attributes: ["title", "content"]
  });
  return articles.reduce(
    (total, article) => total + article.title.length + article.content.length,
    0
  );
};

export const SaveKnowledgeService = async (
  companyId: number,
  data: ArticleData,
  articleId?: number | string
): Promise<KnowledgeArticle> => {
  let values: ArticleData;
  try {
    values = (await schema.validate(data)) as ArticleData;
  } catch (err) {
    throw new AppError(err.message);
  }

  let article: KnowledgeArticle | null = null;
  if (articleId) {
    article = await KnowledgeArticle.findOne({
      where: { id: articleId, companyId }
    });
    if (!article) {
      throw new AppError("ERR_KNOWLEDGE_NOT_FOUND", 404);
    }
  } else if (
    (await KnowledgeArticle.count({ where: { companyId } })) >= MAX_ARTICLES
  ) {
    throw new AppError("ERR_KNOWLEDGE_TOO_MANY");
  }

  const active =
    values.active !== undefined ? values.active : article?.active ?? true;
  if (
    active &&
    (await activeCharacters(companyId, articleId)) +
      values.title.length +
      values.content.length >
      MAX_KNOWLEDGE_CHARACTERS
  ) {
    throw new AppError("ERR_KNOWLEDGE_TOO_LARGE");
  }

  const fields = { title: values.title, content: values.content, active };
  if (article) {
    await article.update(fields);
    return article;
  }
  return KnowledgeArticle.create({ ...fields, companyId });
};

// Active articles as text for the AI prompts.
export const FormatKnowledgeForPrompt = async (
  companyId: number
): Promise<string> => {
  const articles = await ListActiveKnowledge(companyId);
  if (articles.length === 0) return "Nenhuma informação cadastrada.";
  return articles
    .map(
      article =>
        `<artigo titulo="${article.title.replace(/"/g, "'")}">\n${
          article.content
        }\n</artigo>`
    )
    .join("\n");
};

export const DeleteKnowledgeService = async (
  companyId: number,
  articleId: number | string
): Promise<void> => {
  const article = await KnowledgeArticle.findOne({
    where: { id: articleId, companyId }
  });
  if (!article) {
    throw new AppError("ERR_KNOWLEDGE_NOT_FOUND", 404);
  }
  await article.destroy();
};
