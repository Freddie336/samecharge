import { defineClientCallable } from "../../callable/define-client-callable";
import { finalizeProfilePhotoSchema } from "./profile-photo-schema";
import {
  createDefaultFinalizeProfilePhotoDependencies,
  finalizeProfilePhotoForUid,
} from "./profile-photo-service";

export const finalizeProfilePhoto = defineClientCallable({
  name: "finalizeProfilePhoto",
  inputSchema: finalizeProfilePhotoSchema,
  handler: (context) => finalizeProfilePhotoForUid(
    context.uid,
    context.data,
    createDefaultFinalizeProfilePhotoDependencies(),
  ),
});
