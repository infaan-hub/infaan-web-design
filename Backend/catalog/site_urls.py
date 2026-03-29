from django.http import HttpResponse
from django.urls import path


def simple_spa_view(_request):
    return HttpResponse("Infaan Web & Design public route", content_type="text/plain")


urlpatterns = [
    path("home", simple_spa_view, name="home"),
    path("portfolio", simple_spa_view, name="portfolio"),
    path("potfolio", simple_spa_view, name="potfolio"),
    path("package", simple_spa_view, name="package"),
    path("login", simple_spa_view, name="login"),
    path("register", simple_spa_view, name="register"),
]
