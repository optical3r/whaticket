import { Request, Response } from "express";

import { getAiSettings, updateAiSettings } from "../helpers/AiSettings";
import {
  aiModel,
  getAiAccess,
  getCompanyKey,
  getPlanAi,
  getUsageSummary,
  isAiConfigured,
  removeCompanyKey,
  saveCompanyKey
} from "../libs/ai";
import AppError from "../errors/AppError";
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
  const [settings, plan, usage, key, access] = await Promise.all([
    getAiSettings(companyId),
    getPlanAi(companyId),
    getUsageSummary(companyId),
    getCompanyKey(companyId),
    getAiAccess(companyId, { ignoreLimit: true })
  ]);

  return res.status(200).json({
    ...settings,
    // Whether the AI buttons should show; a used-up limit still shows them
    // so the agent learns why a request fails.
    available: access.allowed,
    unavailableReason: access.reason || null,
    planEnabled: plan.planEnabled,
    keySource: plan.keySource,
    configured:
      plan.keySource === "company" ? Boolean(key.key) : isAiConfigured(),
    keyHint: plan.keySource === "company" ? key.hint : null,
    model: aiModel(),
    usage: { ...usage, used: usage.requests, limit: plan.limit }
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

const assertCompanyKeyPlan = async (companyId: number): Promise<void> => {
  const plan = await getPlanAi(companyId);
  if (!plan.planEnabled || plan.keySource !== "company") {
    throw new AppError("ERR_AI_KEY_NOT_ALLOWED", 403);
  }
};

export const saveKey = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertCompanyKeyPlan(req.user.companyId);
  const keyHint = await saveCompanyKey(req.user.companyId, req.body.apiKey);

  return res.status(200).json({ keyHint });
};

export const removeKey = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await removeCompanyKey(req.user.companyId);

  return res.status(200).json({ message: "Key removed" });
};
