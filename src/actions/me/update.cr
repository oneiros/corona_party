class Me::Update < BrowserAction
  patch "/me" do
    UpdateUser.update(current_user, params) do |operation, user|
      if operation.saved?
        flash.success = "The record has been updated"
        redirect Show
      else
        flash.failure = "It looks like the form is not valid"
        html EditPage, operation: operation
      end
    end
  end
end
