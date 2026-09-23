from django.urls import path
from .views import HomeView, ContactSubmitView

app_name = 'portfolio'

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('api/contact/', ContactSubmitView.as_view(), name='api_contact'),
]
