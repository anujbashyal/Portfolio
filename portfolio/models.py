from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [
        ('DEPLOYED', 'Deployed'),
        ('IN_PROGRESS', 'In Progress'),
        ('DEPRECATED', 'Deprecated'),
    ]

    title = models.CharField(max_length=200, help_text="The main title of the project")
    tag = models.CharField(max_length=50, help_text="e.g. #001 // INTERNAL SYSTEMS")
    description = models.TextField(help_text="A brief technical overview of the project")
    tech_stack = models.CharField(max_length=255, help_text="Comma-separated list of tech used (e.g. Python, Django, PostgreSQL)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DEPLOYED')
    order = models.PositiveIntegerField(default=0, help_text="Ordering field for the frontend display (lower is first)")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title} ({self.tag})"

class PortfolioSettings(models.Model):
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True, help_text="Upload your profile photo here")

    class Meta:
        verbose_name_plural = "Portfolio Settings"

    def __str__(self):
        return "Global Portfolio Settings"
