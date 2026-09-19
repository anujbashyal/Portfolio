from django.urls import path
from .views import AboutView, PortfolioIndexView, ServicesView, ContactSubmitView

app_name = 'portfolio'

urlpatterns = [
    path('', AboutView.as_view(), name='about'),
    path('portfolio/', PortfolioIndexView.as_view(), name='portfolio'),
    path('services/', ServicesView.as_view(), name='services'),
    path('api/contact/', ContactSubmitView.as_view(), name='api_contact'),
]
