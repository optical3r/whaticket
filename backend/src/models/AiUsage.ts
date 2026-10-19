import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";

// One row per AI request, used for the plan's monthly limit.
@Table
class AiUsage extends Model<AiUsage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  feature: string;

  @AllowNull(false)
  @Column
  model: string;

  @AllowNull(false)
  @Column
  inputTokens: number;

  @AllowNull(false)
  @Column
  outputTokens: number;

  @Column
  ticketId: number;

  @Column
  userId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiUsage;
