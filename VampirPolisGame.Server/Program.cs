using VampirPolisGame.Server.Hubs;
using VampirPolisGame.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(10);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddSingleton<RoomService>();
builder.Services.AddSingleton<GameService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        // Tüm originlere izin ver (production için buraya gerçek domain'i ekle)
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseRouting();

app.MapHub<GameHub>("/gameHub");

app.MapGet("/", () => "Vampir-Polis API is running!");

app.Run();