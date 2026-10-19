import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";

// A column of the company's Kanban board (for example: new, proposal sent,
// waiting for payment). Tickets without a stage sit in the first column.
@Table
class KanbanStage extends Model<KanbanStage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  color: string;

  @Default(0)
  @Column
  position: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KanbanStage;
