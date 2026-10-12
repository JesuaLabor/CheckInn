from django.urls import path
from .views import HotelListView, HotelDetailView, AvailableRoomsView

urlpatterns = [
    path('inns/', HotelListView.as_view(), name='hotel_list'),
    path('inns/<slug:slug>/', HotelDetailView.as_view(), name='hotel_detail'),
    path('inns/<slug:slug>/rooms/available/', AvailableRoomsView.as_view(), name='hotel_available_rooms'),
]
