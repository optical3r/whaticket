import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Tag from "./Tag";

@Table
class TicketTag extends Model<TicketTag> {
  @PrimaryKey
  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @PrimaryKey
  @ForeignKey(() => Tag)
  @Column
  tagId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketTag;
