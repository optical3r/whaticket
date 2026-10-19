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
  HasMany
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

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Company)
  companies: Company[];
}

export default Plan;
