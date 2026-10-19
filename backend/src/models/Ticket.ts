import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  AutoIncrement,
  Default,
  BelongsToMany,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Tag from "./Tag";
import TicketTag from "./TicketTag";
import CloseReason from "./CloseReason";

import Contact from "./Contact";
import Message from "./Message";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";

@Table
class Ticket extends Model<Ticket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "pending" })
  status: string;

  @Column
  unreadMessages: number;

  @Column
  lastMessage: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @HasMany(() => Message)
  messages: Message[];

  @BelongsToMany(() => Tag, () => TicketTag)
  tags: Tag[];

  @ForeignKey(() => CloseReason)
  @Column
  closeReasonId: number;

  @BelongsTo(() => CloseReason)
  closeReason: CloseReason;

  @Column(DataType.DATE)
  closedAt: Date | null;

  // Last time the out-of-hours message was sent for this ticket.
  @Column(DataType.DATE)
  outOfHoursNotifiedAt: Date | null;

  // Set when the virtual assistant handed the conversation to the team.
  @Column(DataType.DATE)
  aiHandoffAt: Date | null;

  @Default(0)
  @Column
  aiReplies: number;
}

export default Ticket;
