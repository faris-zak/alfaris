import rawEvidence from "@/generated/public-profile.json";
import { evidenceSchema, type Evidence } from "./schemas";

export function getPublicEvidence(): Evidence[] {
  return evidenceSchema.array().parse(rawEvidence);
}
