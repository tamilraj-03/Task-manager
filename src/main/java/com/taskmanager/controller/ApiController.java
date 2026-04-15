package com.taskmanager.controller;

import com.taskmanager.model.Task;
import com.taskmanager.model.User;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.service.ExcelExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
public class ApiController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ExcelExportService excelExportService;

    @PostMapping("/users")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
        if (existingUser.isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email already exists.");
            return ResponseEntity.badRequest().body(error);
        }
        if (user.getPassword() == null || user.getPassword().trim().isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Password is required.");
            return ResponseEntity.badRequest().body(error);
        }
        User savedUser = userRepository.save(user);
        // Return user data without password
        Map<String, Object> response = new HashMap<>();
        response.put("id", savedUser.getId());
        response.put("name", savedUser.getName());
        response.put("email", savedUser.getEmail());
        response.put("department", savedUser.getDepartment());
        response.put("role", savedUser.getRole());
        response.put("isAdmin", savedUser.getIsAdmin() != null && savedUser.getIsAdmin());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (email == null || password == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email and password are required.");
            return ResponseEntity.badRequest().body(error);
        }

        Optional<User> userOptional = userRepository.findByEmailAndPassword(email, password);
        if (!userOptional.isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid email or password.");
            return ResponseEntity.status(401).body(error);
        }

        User user = userOptional.get();
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("department", user.getDepartment());
        response.put("role", user.getRole());
        response.put("isAdmin", user.getIsAdmin() != null && user.getIsAdmin());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{id}/tasks")
    public ResponseEntity<List<Task>> getUserTasks(@PathVariable Long id) {
        Optional<User> user = userRepository.findById(id);
        if (!user.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        List<Task> tasks = taskRepository.findByUserId(id);
        return ResponseEntity.ok(tasks);
    }

    @PostMapping("/users/{id}/tasks")
    public ResponseEntity<?> saveUserTasks(@PathVariable Long id, @RequestBody List<Task> tasks) {
        Optional<User> userOptional = userRepository.findById(id);
        if (!userOptional.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOptional.get();

        // Delete existing tasks to keep it simple and overwrite with new grid
        List<Task> existingTasks = taskRepository.findByUserId(id);
        taskRepository.deleteAll(existingTasks);

        // Assign user to tasks and save
        for (Task task : tasks) {
            task.setUser(user);
            taskRepository.save(task);
        }

        return ResponseEntity.ok().build();
    }

    @PatchMapping("/tasks/{taskId}/complete")
    public ResponseEntity<?> toggleTaskComplete(@PathVariable Long taskId, @RequestParam Boolean completed) {
        Optional<Task> taskOp = taskRepository.findById(taskId);
        if (!taskOp.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Task task = taskOp.get();
        task.setCompleted(completed);
        taskRepository.save(task);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{id}/tasks/export")
    public ResponseEntity<InputStreamResource> exportTasks(@PathVariable Long id) {
        Optional<User> userOptional = userRepository.findById(id);
        if (!userOptional.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOptional.get();
        List<Task> tasks = taskRepository.findByUserId(id);

        ByteArrayInputStream in = excelExportService.exportTasksToExcel(user, tasks);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=tasks_" + user.getName().replaceAll(" ", "_") + ".xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }

    // ─── Admin Endpoints ────────────────────────────────────────────

    @GetMapping("/admin/users")
    public ResponseEntity<?> getAdminUserList(@RequestParam Long adminId) {
        Optional<User> admin = userRepository.findById(adminId);
        if (!admin.isPresent() || !Boolean.TRUE.equals(admin.get().getIsAdmin())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Unauthorized. Admin access required.");
            return ResponseEntity.status(403).body(error);
        }

        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (User u : users) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", u.getId());
            userMap.put("name", u.getName());
            userMap.put("email", u.getEmail());
            userMap.put("department", u.getDepartment());
            userMap.put("role", u.getRole());
            userMap.put("isAdmin", u.getIsAdmin() != null && u.getIsAdmin());
            userMap.put("taskCount", u.getTasks() != null ? u.getTasks().size() : 0);
            result.add(userMap);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/admin/register")
    public ResponseEntity<?> adminRegisterUser(@RequestParam Long adminId, @RequestBody User user) {
        Optional<User> admin = userRepository.findById(adminId);
        if (!admin.isPresent() || !Boolean.TRUE.equals(admin.get().getIsAdmin())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Unauthorized. Admin access required.");
            return ResponseEntity.status(403).body(error);
        }

        Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
        if (existingUser.isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email already exists.");
            return ResponseEntity.badRequest().body(error);
        }
        if (user.getPassword() == null || user.getPassword().trim().isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Password is required.");
            return ResponseEntity.badRequest().body(error);
        }
        if (user.getIsAdmin() == null) {
            user.setIsAdmin(false);
        }
        User savedUser = userRepository.save(user);
        Map<String, Object> response = new HashMap<>();
        response.put("id", savedUser.getId());
        response.put("name", savedUser.getName());
        response.put("email", savedUser.getEmail());
        response.put("department", savedUser.getDepartment());
        response.put("role", savedUser.getRole());
        response.put("isAdmin", savedUser.getIsAdmin());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin/users/{userId}/tasks")
    public ResponseEntity<?> adminGetUserTasks(@PathVariable Long userId, @RequestParam Long adminId) {
        Optional<User> admin = userRepository.findById(adminId);
        if (!admin.isPresent() || !Boolean.TRUE.equals(admin.get().getIsAdmin())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Unauthorized. Admin access required.");
            return ResponseEntity.status(403).body(error);
        }

        Optional<User> user = userRepository.findById(userId);
        if (!user.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        List<Task> tasks = taskRepository.findByUserId(userId);
        return ResponseEntity.ok(tasks);
    }

    @DeleteMapping("/admin/users/{userId}")
    public ResponseEntity<?> adminDeleteUser(@PathVariable Long userId, @RequestParam Long adminId) {
        Optional<User> admin = userRepository.findById(adminId);
        if (!admin.isPresent() || !Boolean.TRUE.equals(admin.get().getIsAdmin())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Unauthorized. Admin access required.");
            return ResponseEntity.status(403).body(error);
        }

        if (!userRepository.existsById(userId)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/admin/users/tasks/export-all")
    public ResponseEntity<InputStreamResource> adminExportAllTasks(@RequestParam Long adminId) {
        Optional<User> admin = userRepository.findById(adminId);
        if (!admin.isPresent() || !Boolean.TRUE.equals(admin.get().getIsAdmin())) {
            return ResponseEntity.status(403).build();
        }

        List<User> users = userRepository.findAll();
        ByteArrayInputStream in = excelExportService.exportAllUsersTasksToExcel(users, taskRepository);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=all_users_tasks.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
