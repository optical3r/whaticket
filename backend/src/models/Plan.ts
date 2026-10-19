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

  // AI requests allowed per month for each company on the plan.
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
