package com.taskmanager.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The fields requested:
    // Day (Monday-Saturday), Week, Date, Total Hours Handling, Total Free Hours, 
    // Session, Class, Timing, Mentor, Subject, Unit, Topics to Cover, and PPT Link.

    private String dayOfWeek;
    private String week;
    private String taskDate; // Using String or LocalDate depending on formatting preference, String is simpler for vanilla JS grid

    private Integer totalHoursHandling;
    private Integer totalFreeHours;

    private String sessionDetails;
    private String className;
    private String timing;
    private String mentor;
    private String subject;
    private String unit;
    
    @Column(columnDefinition = "TEXT")
    private String topicsToCover;
    
    private String pptLink;
    
    private Boolean completed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    public Task() {
    }

    public Task(Long id, String dayOfWeek, String week, String taskDate, Integer totalHoursHandling, Integer totalFreeHours, String sessionDetails, String className, String timing, String mentor, String subject, String unit, String topicsToCover, String pptLink, Boolean completed, User user) {
        this.id = id;
        this.dayOfWeek = dayOfWeek;
        this.week = week;
        this.taskDate = taskDate;
        this.totalHoursHandling = totalHoursHandling;
        this.totalFreeHours = totalFreeHours;
        this.sessionDetails = sessionDetails;
        this.className = className;
        this.timing = timing;
        this.mentor = mentor;
        this.subject = subject;
        this.unit = unit;
        this.topicsToCover = topicsToCover;
        this.pptLink = pptLink;
        this.completed = completed != null ? completed : false;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public String getWeek() { return week; }
    public void setWeek(String week) { this.week = week; }

    public String getTaskDate() { return taskDate; }
    public void setTaskDate(String taskDate) { this.taskDate = taskDate; }

    public Integer getTotalHoursHandling() { return totalHoursHandling; }
    public void setTotalHoursHandling(Integer totalHoursHandling) { this.totalHoursHandling = totalHoursHandling; }

    public Integer getTotalFreeHours() { return totalFreeHours; }
    public void setTotalFreeHours(Integer totalFreeHours) { this.totalFreeHours = totalFreeHours; }

    public String getSessionDetails() { return sessionDetails; }
    public void setSessionDetails(String sessionDetails) { this.sessionDetails = sessionDetails; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getTiming() { return timing; }
    public void setTiming(String timing) { this.timing = timing; }

    public String getMentor() { return mentor; }
    public void setMentor(String mentor) { this.mentor = mentor; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getTopicsToCover() { return topicsToCover; }
    public void setTopicsToCover(String topicsToCover) { this.topicsToCover = topicsToCover; }

    public String getPptLink() { return pptLink; }
    public void setPptLink(String pptLink) { this.pptLink = pptLink; }

    public Boolean getCompleted() { return completed; }
    public void setCompleted(Boolean completed) { this.completed = completed; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
