$path = 'c:/Users/hp/Desktop/Hulegeb/front-end/src/app/[locale]/page.tsx'

$newLines = @(
  '      <section id="categories" className="section">',
  '        <Container>',
  '          <Reveal delay={0}>',
  '            <SectionHeading',
  '              eyebrow={dict.home.categoriesEyebrow}',
  '              title={dict.home.categoriesTitle}',
  '              description={dict.home.categoriesDescription}',
  '            />',
  '          </Reveal>',
  '',
  '          {categoryTiles.length > 0 ? (',
  '            <div className="categories-strip">',
  '              {categoryTiles.map((category, index) => {',
  '                const title = locale === "am" ? category.nameAm : category.nameEn;',
  '                const image = getProductImage(findCategoryProduct(category, products));',
  '                return (',
  '                  <Reveal key={category.id} delay={Math.min(200 + index * 100, 900)}>',
  '                    <CategoryCard',
  '                      category={category}',
  '                      title={title}',
  '                      image={image}',
  '                      locale={locale}',
  '                      eyebrow={dict.home.categoriesEyebrow}',
  '                      explore={dict.home.exploreCategories}',
  '                    />',
  '                  </Reveal>',
  '                );',
  '              })}',
  '            </div>',
  '          ) : null}',
  '',
  '          {categoryError ? (',
  '            <p className="mt-6 text-sm text-danger" role="alert">',
  '              {categoryError}',
  '            </p>',
  '          ) : categoryTiles.length === 0 ? (',
  '            <p className="mt-6 text-sm text-muted-foreground">',
  '              {dict.home.categoriesUnavailable}',
  '            </p>',
  '          ) : null}',
  '        </Container>',
  '      </section>'
)
$newSection = [string]::Join("`n", $newLines)

$bytes = [System.IO.File]::ReadAllBytes($path)
$original = [System.Text.Encoding]::UTF8.GetString($bytes) -replace "`r`n", "`n"

$pattern = '(?s)<section id="categories".*?</section>'
$normalized = [regex]::Replace($original, $pattern, $newSection)

$result = $normalized -replace "`n", "`r`n"
[System.IO.File]::WriteAllBytes($path, [System.Text.Encoding]::UTF8.GetBytes($result))

Write-Output ("Change applied: " + ($original -ne $result))
