-- Crear la base de datos
CREATE DATABASE CIM;
USE CIM;

-- ==============================
-- Tabla: Roles
-- ==============================
CREATE TABLE Roles (
    RolID INT AUTO_INCREMENT PRIMARY KEY,
    NombreRol VARCHAR(50) NOT NULL UNIQUE,
    Descripcion TEXT
);

-- ==============================
-- Tabla: Usuarios
-- ==============================
CREATE TABLE Usuarios (
    UsuarioID INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Rol VARCHAR(50) NOT NULL,
    FechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Estado BOOLEAN DEFAULT 1,
    FOREIGN KEY (Rol) REFERENCES Roles(NombreRol)
);

-- ==============================
-- Tabla: Productos
-- ==============================
CREATE TABLE Productos (
    ProductoID INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion TEXT,
    PesoDisponible DECIMAL(10,2) NOT NULL,
    PrecioPorLibra DECIMAL(10,2) NOT NULL,
    PrecioPorMediaLibra DECIMAL(10,2) NOT NULL,
    CantidadMinima INT NOT NULL,
    TipoEmpaque VARCHAR(50),
    Estado BOOLEAN DEFAULT 1,
    FechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    PesoXCaja INT
);

-- ==============================
-- Tabla: Ventas
-- ==============================
CREATE TABLE Ventas (
    VentaID INT AUTO_INCREMENT PRIMARY KEY,
    UsuarioID INT,
    FechaVenta DATETIME DEFAULT CURRENT_TIMESTAMP,
    TotalVenta DECIMAL(10,2) NOT NULL,
    TipoVenta VARCHAR(50) NOT NULL,
    Ganancia DECIMAL(10,2) NOT NULL,
    DetalleVenta TEXT,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID)
);

-- ==============================
-- Tabla: DetalleVenta
-- ==============================
CREATE TABLE DetalleVenta (
    DetalleVentaID INT AUTO_INCREMENT PRIMARY KEY,
    VentaID INT,
    ProductoID INT,
    Cantidad DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID)
);

-- ==============================
-- Tabla: Combos
-- ==============================
CREATE TABLE Combos (
    ComboID INT AUTO_INCREMENT PRIMARY KEY,
    NombreCombo VARCHAR(100) NOT NULL,
    Descripcion TEXT,
    PrecioCombo DECIMAL(10,2) NOT NULL,
    Estado BOOLEAN DEFAULT 1,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================
-- Tabla: DetalleCombo
-- ==============================
CREATE TABLE DetalleCombo (
    DetalleComboID INT AUTO_INCREMENT PRIMARY KEY,
    ComboID INT,
    ProductoID INT,
    Cantidad DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (ComboID) REFERENCES Combos(ComboID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID)
);

-- ==============================
-- Tabla: RegistroActividades
-- ==============================
CREATE TABLE RegistroActividades (
    ActividadID INT AUTO_INCREMENT PRIMARY KEY,
    UsuarioID INT,
    FechaHora DATETIME DEFAULT CURRENT_TIMESTAMP,
    Accion VARCHAR(255) NOT NULL,
    Descripcion TEXT,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID)
);
