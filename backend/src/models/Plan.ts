import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  HasMany,
  Default
} from "sequelize-typescript";
import Company from "./Company";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Column
  users: number;

  @AllowNull(false)
  @Column
  connections: number;

  @AllowNull(false)
  @Column
  queues: number;

  // Whether companies on this plan can use the AI module.
  @AllowNull(false)
  @Default(false)
  @Column
  aiEnabled: boolean;

  // Whether companies on this plan can send campaigns.
  @AllowNull(false)
  @Default(false)
  @Column
  campaignsEnabled: boolean;

  // Whose Anthropic key pays: "platform" (Cerqueira Labs) or "company"
  // (each company enters its own key).
  @AllowNull(false)
  @Default("platform")
  @Column
  aiKeySource: string;

  // AI requests allowed per month for each company on the plan. Only for
  // plans that use the platform key.
  @AllowNull(false)
  @Default(1000)
  @Column
  aiMonthlyRequests: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Company)
  companies: Company[];
}

export default Plan;
