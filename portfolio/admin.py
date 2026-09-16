from django.contrib import admin
from .models import Project, PortfolioSettings

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'tag', 'status', 'order')
    list_editable = ('order', 'status')
    search_fields = ('title', 'tag')

@admin.register(PortfolioSettings)
class PortfolioSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'profile_photo')
