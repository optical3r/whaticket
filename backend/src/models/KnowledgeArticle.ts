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
  DataType,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";

// What the virtual assistant knows about the company: prices, hours,
// policies, frequent questions.
@Table
class KnowledgeArticle extends Model<KnowledgeArticle> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  title: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  content: string;

  @Default(true)
  @Column
  active: boolean;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KnowledgeArticle;
