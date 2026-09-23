from django.views.generic import ListView, TemplateView
from django.views import View
from django.http import JsonResponse
from django.core.mail import send_mail
from django.conf import settings
import json
from .models import Project, PortfolioSettings, ContactRequest

class HomeView(TemplateView):
    template_name = 'portfolio/index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['settings'] = PortfolioSettings.objects.first()
        context['projects'] = Project.objects.all().order_by('order')
        return context

class ContactSubmitView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            phone = data.get('phone', '')
            project_description = data.get('project_description')
            
            if not all([name, email, project_description]):
                return JsonResponse({'success': False, 'error': 'All fields are required.'}, status=400)
                
            # Save to Database
            ContactRequest.objects.create(
                name=name,
                email=email,
                phone=phone,
                project_description=project_description
            )
            
            # Send Email Notification
            # Note: For production, ensure EMAIL_BACKEND and SMTP settings are configured in settings.py
            send_mail(
                subject=f"New Portfolio Contact from {name}",
                message=f"Name: {name}\nEmail: {email}\nPhone: {phone}\n\nProject Description:\n{project_description}",
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@portfolio.local',
                recipient_list=[settings.ADMINS[0][1]] if hasattr(settings, 'ADMINS') and settings.ADMINS else ['admin@portfolio.local'],
                fail_silently=True,
            )
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
