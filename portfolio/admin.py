from django.contrib import admin
from .models import Project, PortfolioSettings, ContactRequest

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'tag', 'status', 'order')
    list_editable = ('order', 'status')
    search_fields = ('title', 'tag')

@admin.register(PortfolioSettings)
class PortfolioSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'profile_photo')

@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'created_at')
    search_fields = ('name', 'email', 'phone')
    readonly_fields = ('created_at',)
