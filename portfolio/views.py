from django.views.generic import ListView, TemplateView
from .models import Project, PortfolioSettings

class AboutView(TemplateView):
    template_name = 'portfolio/about.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['settings'] = PortfolioSettings.objects.first()
        return context

class PortfolioIndexView(ListView):
    model = Project
    template_name = 'portfolio/portfolio.html'
    context_object_name = 'projects'
    
    def get_queryset(self):
        return Project.objects.all().order_by('order')

class ServicesView(TemplateView):
    template_name = 'portfolio/services.html'
