import Mustache from "mustache";
import Contact from "../models/Contact";

export default (body: string, contact: Contact): string => {
  const name = contact ? contact.name || "" : "";
  const view = {
    name,
    firstName: name.trim().split(/\s+/)[0] || ""
  };
  return Mustache.render(body, view);
};
