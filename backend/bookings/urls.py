from django.urls import path
from .views import (
    BookingCreateView,
    MyBookingsView,
    BookingDetailView,
    StaffPendingRequestsView,
    StaffAllBookingsView,
    StaffApproveRequestView,
    StaffRejectRequestView,
    WalkInBookingView,
    CheckInBookingView,
    CheckOutBookingView,
    BookingReviewView,
    GuestCancelBookingView,
    StaffNoShowBookingView,
    StaffRoomStatusBoardView,
    StaffExtendStayView,
    ServiceRequestListCreateView,
    ServiceRequestUpdateView,
    AdminOccupancyReportView,
)

urlpatterns = [
    # Guest & Staff Booking endpoints
    path('bookings/', BookingCreateView.as_view(), name='booking_create'),
    path('bookings/my/', MyBookingsView.as_view(), name='my_bookings'),
    path('bookings/walkin/', WalkInBookingView.as_view(), name='walkin_booking'),
    path('bookings/<str:pk>/', BookingDetailView.as_view(), name='booking_detail'),
    path('bookings/<str:pk>/cancel/', GuestCancelBookingView.as_view(), name='booking_cancel'),
    path('bookings/<str:pk>/review/', BookingReviewView.as_view(), name='booking_review'),

    # Staff endpoints
    path('staff/requests/pending/', StaffPendingRequestsView.as_view(), name='staff_pending_requests'),
    path('staff/bookings/', StaffAllBookingsView.as_view(), name='staff_all_bookings'),
    path('staff/bookings/<str:pk>/noshow/', StaffNoShowBookingView.as_view(), name='staff_booking_noshow'),
    path('staff/requests/<str:pk>/approve/', StaffApproveRequestView.as_view(), name='staff_approve_request'),
    path('staff/requests/<str:pk>/reject/', StaffRejectRequestView.as_view(), name='staff_reject_request'),
    path('bookings/<str:pk>/checkin/', CheckInBookingView.as_view(), name='booking_checkin'),
    path('bookings/<str:pk>/checkout/', CheckOutBookingView.as_view(), name='booking_checkout'),
    path('bookings/<str:pk>/extend/', StaffExtendStayView.as_view(), name='booking_extend'),
    path('staff/rooms/status/', StaffRoomStatusBoardView.as_view(), name='staff_rooms_status'),

    # Service requests
    path('service-requests/', ServiceRequestListCreateView.as_view(), name='service_requests_list_create'),
    path('staff/service-requests/<str:pk>/', ServiceRequestUpdateView.as_view(), name='service_request_update'),

    # Admin reports
    path('admin/reports/occupancy/', AdminOccupancyReportView.as_view(), name='admin_occupancy_report'),
]
