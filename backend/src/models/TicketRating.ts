import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";
import User from "./User";

// Customer satisfaction survey sent when a ticket is closed. rating stays
// null until the customer answers with a number from 1 to 5.
@Table
class TicketRating extends Model<TicketRating> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  rating: number;

  @Column
  ratedAt: Date;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketRating;
