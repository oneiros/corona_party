class Me::EditPage < MainLayout
  needs operation : UpdateUser
  quick_def page_title, "Edit Profile"

  def content
    h1 "Update Profile"
    render_user_form(@operation)
  end

  def render_user_form(op)
    form_for Me::Update do
      mount Shared::Field.new(op.email, "Email"), &.text_input(autofocus: "true")
      mount Shared::Field.new(op.password, "Password"), &.password_input
      mount Shared::Field.new(op.password_confirmation, "Confirm Password"), &.password_input

      submit "Update", class: "btn btn-primary", data_disable_with: "Updating..."
    end
  end
end
