FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY ["VampirPolisGame.Server.csproj", "./"]
RUN dotnet restore "VampirPolisGame.Server.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "VampirPolisGame.Server.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "VampirPolisGame.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "VampirPolisGame.Server.dll"]
