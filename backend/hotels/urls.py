from django.urls import path
from .views import (
    HotelListView,
    DestinationListView,
    ExchangeRatesView,
    HotelDetailView,
    AvailableRoomsView,
    PartnerRegisterView,
    PlatformStatsView,
    PlatformHotelListView,
    PlatformHotelReviewView,
    HotelManageProfileView,
    HotelManageStaffView,
    HotelManageStaffDetailView,
    HotelManageRoomTypeView,
    HotelManageRoomTypeDetailView,
    HotelManageRoomView,
    HotelManageRoomDetailView,
    HotelAuditLogListView,
    HotelReviewsListView,
)

urlpatterns = [
    # Marketplace public endpoints
    path('inns/', HotelListView.as_view(), name='hotel_list'),
    path('inns/destinations/', DestinationListView.as_view(), name='destination_list'),
    path('inns/exchange-rates/', ExchangeRatesView.as_view(), name='exchange_rates'),
    path('inns/partner-register/', PartnerRegisterView.as_view(), name='partner_register'),
    path('inns/<slug:slug>/', HotelDetailView.as_view(), name='hotel_detail'),
    path('inns/<slug:pk_or_slug>/reviews/', HotelReviewsListView.as_view(), name='hotel_reviews'),
    path('inns/<slug:slug>/rooms/available/', AvailableRoomsView.as_view(), name='hotel_available_rooms'),

    # Platform Super Admin endpoints
    path('platform/stats/', PlatformStatsView.as_view(), name='platform_stats'),
    path('platform/hotels/', PlatformHotelListView.as_view(), name='platform_hotels'),
    path('platform/hotels/<str:pk>/review/', PlatformHotelReviewView.as_view(), name='platform_hotel_review'),

    # Hotel Owner Management endpoints (Multi-Tenant)
    path('hotel-manage/profile/', HotelManageProfileView.as_view(), name='hotel_manage_profile'),
    path('hotel-manage/staff/', HotelManageStaffView.as_view(), name='hotel_manage_staff'),
    path('hotel-manage/staff/<str:pk>/', HotelManageStaffDetailView.as_view(), name='hotel_manage_staff_detail'),
    path('hotel-manage/room-types/', HotelManageRoomTypeView.as_view(), name='hotel_manage_room_types'),
    path('hotel-manage/room-types/<str:pk>/', HotelManageRoomTypeDetailView.as_view(), name='hotel_manage_room_type_detail'),
    path('hotel-manage/rooms/', HotelManageRoomView.as_view(), name='hotel_manage_rooms'),
    path('hotel-manage/rooms/<str:pk>/', HotelManageRoomDetailView.as_view(), name='hotel_manage_room_detail'),
    path('hotel-manage/audit-logs/', HotelAuditLogListView.as_view(), name='hotel_manage_audit_logs'),
]
