class Rooms::New < BrowserAction
  route do
    html NewPage, operation: SaveRoom.new
  end
end
