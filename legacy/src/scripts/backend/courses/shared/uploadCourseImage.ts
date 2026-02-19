// ==========================================================================
// COURSE IMAGE STORAGE SERVICE
// ==========================================================================

import { supabase } from "../../supabase";

const COURSE_BUCKET = "courses";
const COURSE_IMAGE_FOLDER = "course-images";

interface UploadCourseImageParams {
    file: File;
    courseId: string;
}

function getFileExtension(file: File): string {
    const nameExt = file.name?.split(".").pop();
    if (nameExt && nameExt !== file.name) {
        const sanitized = nameExt.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (sanitized) {
            return sanitized;
        }
    }

    const mimeExt = file.type?.split("/").pop();
    if (mimeExt) {
        const sanitized = mimeExt.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (sanitized) {
            return sanitized;
        }
    }

    return "png";
}

function buildFilePath(courseId: string, file: File): string {
    const extension = getFileExtension(file);
    const trimmedCourseId = courseId.trim();
    const sanitizedCourseId = trimmedCourseId
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "course";
    return `${COURSE_IMAGE_FOLDER}/${sanitizedCourseId}/cover.${extension}`;
}

export async function uploadCourseImage({
    file,
    courseId,
}: UploadCourseImageParams): Promise<string | null> {
    if (!courseId || !courseId.trim()) {
        console.error("uploadCourseImage called without a valid courseId");
        return null;
    }

    if (!(file instanceof File) || file.size === 0) {
        console.error("uploadCourseImage called with an invalid file");
        return null;
    }

    try {
        const filePath = buildFilePath(courseId, file);
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from(COURSE_BUCKET)
            .upload(filePath, arrayBuffer, {
                cacheControl: "86400",
                upsert: true,
                contentType: file.type || "application/octet-stream",
            });

        if (uploadError) {
            console.error("Error uploading course image:", uploadError);
            return null;
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from(COURSE_BUCKET).getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error("Unexpected error in uploadCourseImage:", error);
        return null;
    }
}

export function extractStoragePathFromUrl(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) {
        return null;
    }

    try {
        const url = new URL(imageUrl);
        // Supabase public URLs often look like .../object/public/<bucket>/<path>
        const publicIndex = url.pathname.indexOf(`/${COURSE_BUCKET}/`);
        if (publicIndex === -1) {
            return url.pathname.startsWith("/")
                ? url.pathname.slice(1)
                : url.pathname;
        }

        return url.pathname.slice(publicIndex + `/${COURSE_BUCKET}/`.length);
    } catch {
        // If it's not a valid URL treat it as a direct storage path
        return imageUrl;
    }
}

export async function deleteCourseImage(imageUrl: string | null | undefined): Promise<boolean> {
    const storagePath = extractStoragePathFromUrl(imageUrl);
    if (!storagePath) {
        return true;
    }

    try {
        const { error } = await supabase.storage
            .from(COURSE_BUCKET)
            .remove([storagePath]);

        if (error) {
            console.error("Error deleting course image:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Unexpected error deleting course image:", error);
        return false;
    }
}
