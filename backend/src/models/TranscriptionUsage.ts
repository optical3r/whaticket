import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";

// One row per transcribed voice note, for the plan's monthly minutes and
// the platform's cost per company.
@Table
class TranscriptionUsage extends Model<TranscriptionUsage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.STRING)
  messageId: string | null;

  @AllowNull(false)
  @Column
  model: string;

  @AllowNull(false)
  @Column
  seconds: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TranscriptionUsage;
