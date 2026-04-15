package com.taskmanager.service;

import com.taskmanager.model.Task;
import com.taskmanager.model.User;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelExportService {

    public ByteArrayInputStream exportTasksToExcel(User user, List<Task> tasks) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Tasks for " + user.getName());

            // Header styling
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "Day", "Week", "Date", "Total Hours Handling", "Total Free Hours",
                    "Session", "Class", "Timing", "Mentor", "Subject", "Unit",
                    "Topics to Cover", "PPT Link"
            };

            for (int col = 0; col < headers.length; col++) {
                Cell cell = headerRow.createCell(col);
                cell.setCellValue(headers[col]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Task task : tasks) {
                Row row = sheet.createRow(rowIdx++);

                row.createCell(0).setCellValue(task.getDayOfWeek() != null ? task.getDayOfWeek() : "");
                row.createCell(1).setCellValue(task.getWeek() != null ? task.getWeek() : "");
                row.createCell(2).setCellValue(task.getTaskDate() != null ? task.getTaskDate() : "");

                if (task.getTotalHoursHandling() != null) {
                    row.createCell(3).setCellValue(task.getTotalHoursHandling());
                } else {
                    row.createCell(3).setCellValue("");
                }

                if (task.getTotalFreeHours() != null) {
                    row.createCell(4).setCellValue(task.getTotalFreeHours());
                } else {
                    row.createCell(4).setCellValue("");
                }

                row.createCell(5).setCellValue(task.getSessionDetails() != null ? task.getSessionDetails() : "");
                row.createCell(6).setCellValue(task.getClassName() != null ? task.getClassName() : "");
                row.createCell(7).setCellValue(task.getTiming() != null ? task.getTiming() : "");
                row.createCell(8).setCellValue(task.getMentor() != null ? task.getMentor() : "");
                row.createCell(9).setCellValue(task.getSubject() != null ? task.getSubject() : "");
                row.createCell(10).setCellValue(task.getUnit() != null ? task.getUnit() : "");
                row.createCell(11).setCellValue(task.getTopicsToCover() != null ? task.getTopicsToCover() : "");
                row.createCell(12).setCellValue(task.getPptLink() != null ? task.getPptLink() : "");
            }

            for (int col = 0; col < headers.length; col++) {
                sheet.autoSizeColumn(col);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());

        } catch (IOException e) {
            throw new RuntimeException("Failed to export data to Excel file: " + e.getMessage());
        }
    }

    public ByteArrayInputStream exportAllUsersTasksToExcel(List<User> users, com.taskmanager.repository.TaskRepository taskRepository) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // Header styling
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] headers = {
                    "Day", "Week", "Date", "Total Hours Handling", "Total Free Hours",
                    "Session", "Class", "Timing", "Mentor", "Subject", "Unit",
                    "Topics to Cover", "PPT Link"
            };

            for (User user : users) {
                // Ensure sheet name is valid Excel max 31 chars and safe chars
                String safeName = user.getName().replaceAll("[\\\\\\\\/?*\\\\[\\\\]]", "");
                if (safeName.length() > 31) {
                    safeName = safeName.substring(0, 31);
                }
                if (safeName.trim().isEmpty()) {
                    safeName = "User_" + user.getId();
                }

                // Check for duplicate sheet names
                String finalName = safeName;
                int suffix = 1;
                while (workbook.getSheet(finalName) != null) {
                    finalName = safeName + "_" + suffix;
                    if (finalName.length() > 31) {
                        finalName = safeName.substring(0, 31 - String.valueOf(suffix).length() - 1) + "_" + suffix;
                    }
                    suffix++;
                }

                Sheet sheet = workbook.createSheet(finalName);

                // Create Header Row
                Row headerRow = sheet.createRow(0);
                for (int col = 0; col < headers.length; col++) {
                    Cell cell = headerRow.createCell(col);
                    cell.setCellValue(headers[col]);
                    cell.setCellStyle(headerStyle);
                }

                List<Task> tasks = taskRepository.findByUserId(user.getId());

                int rowIdx = 1;
                for (Task task : tasks) {
                    Row row = sheet.createRow(rowIdx++);

                    row.createCell(0).setCellValue(task.getDayOfWeek() != null ? task.getDayOfWeek() : "");
                    row.createCell(1).setCellValue(task.getWeek() != null ? task.getWeek() : "");
                    row.createCell(2).setCellValue(task.getTaskDate() != null ? task.getTaskDate() : "");

                    if (task.getTotalHoursHandling() != null) {
                        row.createCell(3).setCellValue(task.getTotalHoursHandling());
                    } else {
                        row.createCell(3).setCellValue("");
                    }

                    if (task.getTotalFreeHours() != null) {
                        row.createCell(4).setCellValue(task.getTotalFreeHours());
                    } else {
                        row.createCell(4).setCellValue("");
                    }

                    row.createCell(5).setCellValue(task.getSessionDetails() != null ? task.getSessionDetails() : "");
                    row.createCell(6).setCellValue(task.getClassName() != null ? task.getClassName() : "");
                    row.createCell(7).setCellValue(task.getTiming() != null ? task.getTiming() : "");
                    row.createCell(8).setCellValue(task.getMentor() != null ? task.getMentor() : "");
                    row.createCell(9).setCellValue(task.getSubject() != null ? task.getSubject() : "");
                    row.createCell(10).setCellValue(task.getUnit() != null ? task.getUnit() : "");
                    row.createCell(11).setCellValue(task.getTopicsToCover() != null ? task.getTopicsToCover() : "");
                    row.createCell(12).setCellValue(task.getPptLink() != null ? task.getPptLink() : "");
                }

                for (int col = 0; col < headers.length; col++) {
                    sheet.autoSizeColumn(col);
                }
            }

            // Create a default sheet if no users exist to avoid empty workbook error
            if (users.isEmpty()) {
                workbook.createSheet("No Users");
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());

        } catch (IOException e) {
            throw new RuntimeException("Failed to export all users data to Excel file: " + e.getMessage());
        }
    }
}
