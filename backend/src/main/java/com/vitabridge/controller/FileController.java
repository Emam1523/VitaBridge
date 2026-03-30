package com.vitabridge.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/uploads")
public class FileController {

    @GetMapping("/profile-photos/{filename:.+}")
    public ResponseEntity<Resource> serveProfilePhoto(@PathVariable String filename) {
        return serveFromDir("uploads/profile-photos", filename);
    }

    @GetMapping("/documents/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        return serveFromDir("uploads/documents", filename);
    }

    private ResponseEntity<Resource> serveFromDir(String dir, String filename) {
        try {
            Path filePath = Paths.get(dir).resolve(filename);
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }
            String lower = filename.toLowerCase();
            String contentType = "application/octet-stream";
            if (lower.endsWith(".pdf"))  contentType = "application/pdf";
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (lower.endsWith(".png"))  contentType = "image/png";
            else if (lower.endsWith(".gif"))  contentType = "image/gif";
            else if (lower.endsWith(".webp")) contentType = "image/webp";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
