import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey
} from "sequelize-typescript";
import Contact from "./Contact";
import Tag from "./Tag";

@Table
class ContactTag extends Model<ContactTag> {
  @PrimaryKey
  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @PrimaryKey
  @ForeignKey(() => Tag)
  @Column
  tagId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ContactTag;
