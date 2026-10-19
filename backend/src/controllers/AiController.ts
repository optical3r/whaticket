import { Request, Response } from "express";

import { getAiSettings, updateAiSettings } from "../helpers/AiSettings";
import { aiModel, getMonthlyUsage, isAiConfigured } from "../libs/ai";
import {
  RewriteTextService,
  SuggestReplyService,
  SummarizeTicketService
} from "../services/AiServices/CopilotServices";
import {
  DeleteKnowledgeService,
  ListKnowledgeService,
  SaveKnowledgeService
} from "../services/AiServices/KnowledgeServices";

// Every user can see whether AI is available (to show the buttons); only
// admins change the settings and the knowledge base.
export const showSettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const [settings, usage] = await Promise.all([
    getAiSettings(companyId),
    getMonthlyUsage(companyId)
  ]);

  const { planEnabled, ...counts } = usage;

  return res.status(200).json({
    ...settings,
    configured: isAiConfigured(),
    planEnabled,
    model: aiModel(),
    usage: counts
  });
};

export const updateSettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const settings = await updateAiSettings(req.user.companyId, req.body);

  return res.status(200).json(settings);
};

export const listKnowledge = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const articles = await ListKnowledgeService(req.user.companyId);

  return res.status(200).json(articles);
};

export const storeKnowledge = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { title, content, active } = req.body;
  const article = await SaveKnowledgeService(req.user.companyId, {
    title,
    content,
    active
  });

  return res.status(200).json(article);
};

export const updateKnowledge = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { title, content, active } = req.body;
  const article = await SaveKnowledgeService(
    req.user.companyId,
    { title, content, active },
    req.params.articleId
  );

  return res.status(200).json(article);
};

export const removeKnowledge = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await DeleteKnowledgeService(req.user.companyId, req.params.articleId);

  return res.status(200).json({ message: "Article deleted" });
};

export const suggest = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const text = await SuggestReplyService({
    ticketId: req.params.ticketId,
    companyId: req.user.companyId,
    userId: Number(req.user.id)
  });

  return res.status(200).json({ text });
};

export const summarize = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const text = await SummarizeTicketService({
    ticketId: req.params.ticketId,
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    language: req.body.language
  });

  return res.status(200).json({ text });
};

export const rewrite = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const text = await RewriteTextService({
    text: req.body.text,
    mode: req.body.mode,
    companyId: req.user.companyId,
    userId: Number(req.user.id)
  });

  return res.status(200).json({ text });
};
