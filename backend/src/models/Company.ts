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
  Default,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";
import Plan from "./Plan";
import User from "./User";
import Whatsapp from "./Whatsapp";

export type CompanyStatus = "active" | "suspended";

@Table
class Company extends Model<Company> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Default("active")
  @Column
  status: CompanyStatus;

  @ForeignKey(() => Plan)
  @AllowNull(false)
  @Column
  planId: number;

  @BelongsTo(() => Plan)
  plan: Plan;

  @Column
  termsAcceptedAt: Date;

  @Column
  termsAcceptedBy: string;

  // IANA time zone used for business hours and reports.
  @AllowNull(false)
  @Default("America/Sao_Paulo")
  @Column
  timezone: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Whatsapp)
  whatsapps: Whatsapp[];
}

export default Company;
