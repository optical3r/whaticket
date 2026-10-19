import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import QuickAnswer from "../models/QuickAnswer";
import Company from "../models/Company";
import Plan from "../models/Plan";
import Tag from "../models/Tag";
import TicketTag from "../models/TicketTag";
import ContactTag from "../models/ContactTag";
import TicketNote from "../models/TicketNote";
import CloseReason from "../models/CloseReason";
import TicketRating from "../models/TicketRating";
import Webhook from "../models/Webhook";
import KnowledgeArticle from "../models/KnowledgeArticle";
import AiUsage from "../models/AiUsage";

// eslint-disable-next-line
const dbConfig = require("../config/database");
// import dbConfig from "../config/database";

const sequelize = new Sequelize(dbConfig);

const models = [
  User,
  Contact,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  QuickAnswer,
  Company,
  Plan,
  Tag,
  TicketTag,
  ContactTag,
  TicketNote,
  CloseReason,
  TicketRating,
  Webhook,
  KnowledgeArticle,
  AiUsage
];

sequelize.addModels(models);

export default sequelize;
